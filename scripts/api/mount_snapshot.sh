#! /bin/bash
#
#
# Taken from
# http://codeshepherd.blogspot.in/2009/06/init-script-to-mount-ebs-and-attach.html
#
#
# /etc/init.d/mountec2vol
#
# chkconfig: 234 20 50
# description: Assigns an EC2 EBS Volume to a device and mounts the device
#
# To add this as a service run:
#   /sbin/chkconfig --add mountec2vol
#
# VARS
#

#
# Commands:
# load <snapshot-id>
# unload <snapshot-id>
#
#
#
# 
#


DEV="/dev/xvdh"
MOUNT_POINT="/vol"

MAX_TRIES=60


AWS_ACCESS_KEY=AKIAI3KQ4MJU3VUSNJUQ
AWS_SECRET_KEY=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


SNAPSHOTID=$2
EBSVOL=$2

echo "Passed parameter: $2"


create_ebs()
{
    ec2-create-volume --snapshot snap-41aaf3e1 --availability-zone us-east-1c --type gp2
    VOLUMEINFO=$(ec2-create-volume --snapshot $SNAPSHOTID --availability-zone us-east-1c --type gp2)
    VOLARRAY=($VOLUMEINFO)
    EBSVOL=$(echo "${VOLARRAY[1]}")
    echo "Created volume $EBSVOL"

    # Export for later use
    echo "$EBSVOL" > /home/ubuntu/ebsvol

    EBSSTATE="creating"
    while [ "$EBSSTATE" != "available" ]
    do
        VOLUMEINFO=$(ec2-describe-volumes $EBSVOL)
        VOLARRAY=($VOLUMEINFO)
        EBSSTATE=$(echo "${VOLARRAY[5]}")
        echo "State: $EBSSTATE"
    done
    
    /bin/sleep 1
}


attach_ebs()
{
    /bin/echo "====================================="
    /bin/echo "Date: "`date` | tee -a $EC2_LOG;
    /bin/echo "Attaching Elastic Block Store Volumes."
    ec2-attach-volume $EBSVOL -i $INSTANCE -d $DEV 1>&2
    CTR=0
    while [ ! -e "$DEV" ]; do
        /bin/sleep 1
        echo "attaching (loop $CTR)"
        CTR=`expr $CTR + 1`
        if [ $CTR -eq $MAX_TRIES ]
        then
            /bin/echo "WARNING: Cannot attach volume $EBSVOL to $DEV -- Giving up after $MAX_TRIES attempts"
            exit 1
        fi
    done
}

mount_ebs()
{
    /bin/echo "Checking if $MOUNT_POINT is present"
    if [ ! -d $MOUNT_POINT ]; then
        mkdir $MOUNT_POINT 1>&2
    fi
    /bin/echo "Mounting EBS to /vol "
    sudo /bin/mount $DEV $MOUNT_POINT 1>&2
}

unmount_ebs()
{
    /bin/echo "Unmounting Elastic Block Store Volumes."
    sudo /bin/umount $MOUNT_POINT 1>&2
}

detach_ebs()
{
    /bin/echo "Detaching Elastic Block Store Volumes."
    ec2-detach-volume $EBSVOL 1>&2
}

delete_ebs()
{
    echo "Deleting EBS volume"
    EBSSTATE="something"
    while [ "$EBSSTATE" != "available" ]
    do
        VOLUMEINFO=$(ec2-describe-volumes $EBSVOL)
        VOLARRAY=($VOLUMEINFO)
        EBSSTATE=$(echo "${VOLARRAY[5]}")
        echo "State: $EBSSTATE"
    done

    ec2-delete-volume $EBSVOL
}

populate_aws_data()
{
    /bin/echo "Populating AWS data"
    INSTANCE=`curl http://169.254.169.254/latest/meta-data/instance-id 2> /dev/null`
}


case "$1" in
    load)
        populate_aws_data;
        create_ebs;
        attach_ebs;
        mount_ebs;
        ;;
    unload)
        unmount_ebs;
        detach_ebs;
        delete_ebs;
        ;;
    *)
        echo "Usage: $0 {load|unload}"
        exit 1
esac

exit 0
