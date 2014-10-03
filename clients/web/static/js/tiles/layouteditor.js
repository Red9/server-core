define(['vendor/jquery', 'vendor/underscore', 'vendor/jquery.validate'], function($, _) {
    function layoutEditor(sandbox, tile, configuration, doneCallback) {
        function init() {
            $.validator.addMethod("json", function(value, element) {
                if (this.optional(element) === true
                        && value === '') {
                    return true;
                }
                try {
                    JSON.parse(value);
                    return true;
                } catch (e) {
                    return false;
                }
            }, "Must be valid JSON");

            tile.addListener('totalState-resource-deleted',
                    function(event, parameter) {
                        if (parameter.type === 'layout') {
                            tile.place.find(
                                    "select option[value='" + parameter.id + "']"
                                    ).remove();
                        }
                    });

            sandbox.requestTemplate('layouteditor', function(layoutTemplate) {
                sandbox.get('layout', {}, function(layouts) {

                    tile.place.html(layoutTemplate({
                        existingLayouts: layouts
                    }));

                    tile.setTitle('Layouts');

                    tile.place.find('button').on('click', function() {
                        var $this = $(this);
                        var layout;
                        var id;


                        if ($this.data('name') === 'apply') {
                            var pl = sandbox.currentUser.preferredLayout;
                            id = tile.place.find('select option:selected').val();
                            pl['/event/:id'] = id;
                            pl['/dataset/:id'] = id;
                            pl['/video/:id'] = id;

                            sandbox.update('user',
                                    sandbox.currentUser.id,
                                    {preferredLayout: pl},
                            function(err) {
                                console.log('Error: ' + err);
                                window.location.reload();
                            });
                            return;
                        }

                        if ($this.data('name') === 'create') {
                            tile.setTitle('Create new layout');
                            layout = {};
                        } else {
                            id = tile.place.find('select option:selected').val();
                            layout = _.find(layouts, function(l) {
                                return l.id === id;
                            });

                            layout.layout = JSON.stringify(layout.layout, null, '    ');
                            layout.for = JSON.stringify(layout.for, null, '    ');
                            if ($this.data('name') === 'delete') {
                                sandbox.delete('layout', id);
                                return;
                            }

                            if ($this.data('name') === 'edit') {
                                // leave as is.
                                tile.setTitle('Edit layout "'
                                        + sandbox.truncateStringAtWord(layout.title, 40) + '"');
                            } else if ($this.data('name') === 'copy') {
                                tile.setTitle('Copy layout "'
                                        + sandbox.truncateStringAtWord(layout.title, 40) + '"');
                                delete layout.id;
                            }
                        }
                        createForm(layout);
                    });
                });
            });
        }

        function schema(create) {
            return {
                rules: {
                    title: {
                        required: create
                    },
                    description: {
                        required: create
                    },
                    layout: {
                        required: create,
                        json: true
                    },
                    for : {
                        required: create,
                        json: true
                    }
                },
                showErrors: sandbox.showJqueryValidateErrors,
                submitHandler: submitHandler
            };
        }

        function submitHandler(form) {
            var $form = $(form);

            var formValues = {};

            // Convert the HTML form into a key/value list.
            $form.find('input, select, textarea')
                    .not('[name=submitButton]') // This is definately a hack... Couldn't get it to work otherwise.
                    .each(function() {
                        var $this = $(this);
                        var key = $this.attr('name');
                        var value = $this.val();
                        console.log('key: ' + key);
                        formValues[key] = value;

                    });

            formValues.layout = JSON.parse(formValues.layout);
            formValues.for = JSON.parse(formValues.for);

            if (typeof formValues.id !== 'undefined') {
                // Editing layout
                var id = formValues.id;
                delete formValues.id;

                console.log('formValues: ' + JSON.stringify(formValues));

                sandbox.update('layout', id, formValues, function(error) {
                    if (error) {
                        $form.find('[data-name=submitwarning]').text(error).removeClass('hide');
                    } else {
                        tile.destructor();
                    }
                });
            } else {
                // Creating layout                
                sandbox.create('layout', formValues, function(error) {
                    if (error) {
                        $form.find('[data-name=submitwarning]').text(error).removeClass('hide');
                    } else {
                        tile.destructor();
                    }
                });
            }
        }

        function createForm(layout) {
            sandbox.requestTemplate('layouteditor.form', function(layoutFormTemplate) {
                tile.place.html(layoutFormTemplate(layout));
                tile.place.find('form').validate(schema(true));
            });
        }



        function destructor() {
            sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = null;
        }

        init();
        return {
            destructor: destructor
        };
    }
    return layoutEditor;
});

