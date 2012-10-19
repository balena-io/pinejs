define(["cs!frame-glue/glue", "text!./editor.html", "jquery", "codemirror"], (glue, html, $, CodeMirror) ->
    return {
        init: ->
            content = glue("Edit")
            content.html(html)

            sbvrEditor = CodeMirror.fromTextArea($("#editor")[0],
                mode:
                    name: 'sbvr'
                    getOMetaEditor: () -> sbvrEditor
                onKeyEvent: ometaAutoComplete
                lineWrapping: true
            )
    }
)
