# !/bin/bash
SNAPSHOTS=(snap-723251cb snap-41aaf3e1 snap-9abae93a snap-144a32b4 snap-2cd59c8d snap-91d09930 snap-0a85f4a5 snap-943ba63b snap-f4f31e5b snap-f6c36c5d snap-394cb7ee snap-6da747b8 snap-5bb8ea88 snap-fedf672d snap-94780c44 snap-983bad48 snap-ce8b3813 snap-edde8737)

for SNAP in "${SNAPSHOTS[@]}"
do
    echo "Getting snapshot $SNAP"
    /home/ubuntu/mount_snapshot.sh load $SNAP
    cp -nv /vol/upload/rnc/* /home/ubuntu/upload/rnc/
    /home/ubuntu/mount_snapshot.sh unload "$(< /home/ubuntu/ebsvol)"
done




