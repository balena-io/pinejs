define(["jquery", "bootstrap"], ($) ->
	tabNum = 0

	$("#tabs").on("click", "a", (e) ->
		e.preventDefault()
		$(this).tab("show")
	)

	addTab = (title) ->
		id = "tab" + tabNum++
		content = $("""<div id="#{id}"></div>""")

		tabElement = $("""<li><a href="##{id}">#{title}</a></li>""")
		$("#tabs").append(tabElement)
		$("#content").append(content)
		#dsad
		if tabNum is 1
			$("a", tabElement).tab("show")
		return content

	return addTab
)
