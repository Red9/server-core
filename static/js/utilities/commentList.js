define(['vendor/jquery', 'vendor/underscore', 'sandbox', 'vendor/bootstrap-markdown'], function($,_, sandbox) {

    var CommentList = function(myPlace, resourceId, resourceType) {
        if(typeof resourceId === 'undefined' || resourceId === ''){
            return;
        }
        
        this.myPlace = myPlace;
        this.resourceId = resourceId;
        this.resourceType = resourceType;

        var self = this;
        sandbox.get('comment', {resource: resourceId}, function(comments) {
            sandbox.requestTemplate('commentList', function(template) {



                self.myPlace.html(template({
                    commentCount: comments.length,
                    comments: _.map(_.sortBy(comments, function(comment) {
                        return comment.createTime;
                    }), function(comment) {
                        if (comment.startTime !== 0) {
                            if (comment.endTime !== 0) {
                                comment.viewRange = true;
                            } else {
                                comment.viewPoint = true;
                            }
                        }
                        return comment;
                    })
                }));

                self.myPlace.find('[data-name=commentList]').on('click', '[data-name=deleteCommentButton]', function() {
                    var $comment = $(this).parent();
                    var commentId = $comment.data('commentid');

                    console.log('commentId: ' + commentId);
                    sandbox.delete('comment', commentId);
                    $comment.hide('slow');
                    $comment.remove();
                });

                var $commentList = self.myPlace.find('[data-name=commentList]');
                $commentList.on('click', '[data-name=commentFocus]', function() {
                    sandbox.initiateResourceFocusedEvent('dataset', sandbox.getCurrentDatasetId(), $(this).data('starttime'), $(this).data('endtime'));
                });
                $commentList.scrollTop(100000);

                $('[data-name=addCommentTextarea]').markdown({
                    autofocus: false,
                    savable: true,
                    onSave: function(area) {
                        var $saveViewCheckbox = self.myPlace.find('[data-name=saveCurrentViewCheckbox] label input');
                        var startTime = 0;
                        var endTime = 0;
                        if ($saveViewCheckbox.prop('checked')) {
                            console.log('Setting time...');
                            startTime = sandbox.focusState.startTime;
                            endTime = sandbox.focusState.endTime;
                        }


                        sandbox.create('comment', {
                            author: sandbox.currentUser.id,
                            resourceType: self.resourceType,
                            resource: self.resourceId,
                            body: area.getContent(),
                            startTime: startTime,
                            endTime: endTime
                        }, function(error, data) {
                            area.setContent('');
                        });
                    }
                });
            });
        }, ['author']);
    };

    $.fn.commentList = function(resourceId, resourceType) {
        return this.each(function() {
            var $this = $(this);
            var data = $this.data('commentList');
            if (!data) {
                $this.data('commentList', (data = new CommentList($this, resourceId, resourceType)));
            }
        });
    };


});