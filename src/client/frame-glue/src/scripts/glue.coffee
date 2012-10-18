define(["jquery", "bootstrap"], ($) ->
    tabNum = 0

    $("#tabs").on("click", "a", (e) ->
        e.preventDefault()
        $(this).tab("show")
    )

    addTab = (title) ->
        id = "tab" + tabNum++
        content = $("""<div id="#{id}"></div>""")

        $("#tabs").append($("""<li><a href="##{id}">#{title}</a></li>"""))
        $("#content").append(content)

        return content

    return addTab
)
