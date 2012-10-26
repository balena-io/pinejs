define(['jquery', './jquery.json2html'], ->
	COLLAPSED_SYMBOL = '&#x25B8;'
	EXPANDED_SYMBOL = '&#x25BE;'
	LEAF_SYMBOL = '&bull;'
	C_PREFIX = 'lf'

	stripEmpty = (ls) ->
		for i in [0..ls.length]
			el = ls[i]

			if el instanceof Array
				if el.length == 0
					ls.splice(i--)
				else
					stripEmpty(el)

	stripSingleNodes = (ls, parent, index) ->
		if !ls? or (ls?.length ? 0) == 0
			return

		doStrip = ->
			# Leaf nodes always consist of [ 'key', 'val', [] ].
			if ls.length == 2 and typeof(ls[1]) == 'string' or typeof(ls[1]) == 'number'
				text = '' + ls[1]
				parent[index] = "#{ls[0]}: #{text}"

				return true

			return false

		# If we've successfully stripped the node, then it's a leaf.
		if doStrip()
			return

		for i, el of ls when el instanceof Array
			stripSingleNodes(el, ls, i)
			# Strip parents too.
			doStrip()

	stripCamelCase = (ls) ->
		if !ls? or (ls?.length ? 0) == 0
			return

		for i, el of ls
			if typeof (el) == 'string'
				ls[i] = expandCamelCase(el)
			else if el instanceof Array
				stripCamelCase(el)

	expandCamelCase = (str) -> str.replace(/([^ ])([A-Z])/g, '$1 $2')

	handler = (el, ind) ->
		createLink = (str, link) -> "<a href=\"#{link}\">#{str}</a>"
		createSpan = (c, inner) -> "<span class=\"#{c}\">#{inner}</span>"

		collapsed = createSpan("#{C_PREFIX}-symbol-collapsed", COLLAPSED_SYMBOL)
		expanded = createSpan("#{C_PREFIX}-symbol-expanded", EXPANDED_SYMBOL)
		leaf = createSpan("#{C_PREFIX}-symbol-leaf", LEAF_SYMBOL)

		createElementSpans = (str) ->
			if !str
				return

			els = str.split(': ')
			val = els.pop()

			for i, el of els
				els[i] = createSpan("#{C_PREFIX}-type", el)

			els.push(createSpan("#{C_PREFIX}-value", val))

			return els.join(': ')

		if typeof(el) == 'string' or typeof(el) == 'number'
			text = createElementSpans('' + el)

			return "#{leaf} #{text}"

		else if el instanceof Array and el.length > 0
			text = createSpan("#{C_PREFIX}-type", el[0])

			return createLink("#{collapsed}#{expanded} #{text}", '#self')
		else
			return '(unknown)'

	childHandler = (el, ind) ->
		if (el?.length ? 0) > 1
			lis = $.json2html(el[1..], transform)

			# Simply put ul tags around children.
			ulTransform =
				tag: 'ul'
				html: (el) -> el

			$.json2html(lis, ulTransform)
		else
			[]

	initExpandable = ->
		outputId = '#' + C_PREFIX + '-output'
		collapsedClass = C_PREFIX + '-collapsed'

		$("#{outputId} li").addClass(collapsedClass)
		$("#{outputId} a").click(-> $(this).parent().toggleClass(collapsedClass))

	transform = [ tag: 'li', html: handler, children: childHandler ]

	lfViz = (obj, el) ->
		$(el).append('<div class="lf"><ul id="lf-output"></ul></div>')

		outputId = '#' + C_PREFIX + '-output'

		if typeof(obj) == 'string'
			try
				obj = JSON.parse(obj)
			catch err
				return err

		$(outputId).html('')

		if obj?[0]?.toLowerCase() == 'model'
			stripEmpty(obj)
			stripSingleNodes(obj)
			stripCamelCase(obj)

			try
				$(outputId).json2html(obj[1..], transform)
			catch err
				return err
		else
			return 'Missing model node at root.'

		initExpandable()

		return null

	return lfViz
)
