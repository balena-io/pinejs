define(['glue'], (glue)->
    content = glue.addTab("Edit")

    exports.init = ->
        console.log "Initializing SBVR editor"
        textarea = $("<textarea/>")
        content.append(textarea)

        sbvrEditor = CodeMirror.fromTextArea(textarea[0],
            mode: {
                name: 'sbvr'
                getOMetaEditor: () -> sbvrEditor
            }
            onKeyEvent: ometaAutoComplete
            lineWrapping: true
        )
)
