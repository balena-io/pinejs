define([
	'backbone'
	'd3'
	'css!./graph'
], (Backbone, d3) ->
	Backbone.View.extend(
		setTitle: (title) ->
			@options.title.text(title)

		render: ->
			this.setTitle('Visualize')

			@model.on('change:content', =>
				@$el.empty()
				try
					dataset = @model.compile()
				catch e
					console.log(e)
					return
			
				termBlacklist = ['value', 'Short Text', 'Text', 'Integer', 'Date']
				nodes = {}

				for [type,name] in dataset when type is 'Term' and name not in termBlacklist
					nodes[name] = {name, type}

				links = []
				for [type,contents...] in dataset when type is 'FactType'
					switch contents.length
						when 3 # unary
							sourceNode = nodes[contents[0][1]]
							verbNode = nodes[[sourceNode.name, contents[1][1]].join('-')] = {name: contents[1][1], type: 'Verb'}

							link = {source: sourceNode, target: verbNode}
							links.push(link)
							
						when 4 # binary
							break if contents[0][1] in termBlacklist
							break if contents[2][1] in termBlacklist

							sourceNode = nodes[contents[0][1]]
							targetNode = nodes[contents[2][1]]
							# define the verbNode
							verbNode = nodes[[sourceNode.name, contents[1][1], targetNode.name].join('-')] = {name: contents[1][1], type: "Verb"}
							break if targetNode in termBlacklist
							
							link = {source: sourceNode, target: verbNode}
							links.push(link)
							link = {source: verbNode, target: targetNode}
							links.push(link)
							
				w = @$el.width()
				h = @$el.height()

				tick = ->
					path.attr("d", (d) ->
						dx = d.target.x - d.source.x
						dy = d.target.y - d.source.y
						return "M" + d.source.x + "," + d.source.y + "A" + 0 + "," + 0 + " 0 0,1 " + d.target.x + "," + d.target.y
					)

					rect.attr("transform", (d) ->
						xoffset = d3.select(this).attr("width")/2
						yoffset = d3.select(this).attr("height")/2

						d.x = Math.max(xoffset, Math.min(w - xoffset, d.x))
						d.y = Math.max(yoffset, Math.min(h - yoffset, d.y))
						return "translate(" + d.x + "," + d.y + ")"
					)
					
					text.attr("transform", (d) ->
						return "translate(" + d.x + "," + d.y + ")"
					)

				force = d3.layout.force()
					.nodes(d3.values(nodes))
					.links(links)
					.size([w, h])
					.linkDistance(15)
					.charge(-1000)
					.on("tick", tick)
					.start()

				@$el.empty()
				svg = d3.select(@el).append("svg:svg")
					.attr("width", w)
					.attr("height", h)

				path = svg.append("svg:g").selectAll("path")
						.data(force.links())
					.enter().append("svg:path")
						.attr("class", (d) -> "link " + d.type )
						.attr("marker-end", (d) -> "url(#" + d.type + ")")

				rect = svg.append("svg:g").selectAll("rect")
						.data(force.nodes())
					.enter().append("svg:rect")
						.attr("width", (d) ->	Math.max(d.name.length * 7, 20))
						.attr("height", 20)
						.attr("x", (d) -> Math.min(-1*(d.name.length * 7)/2, -10))
						.attr("y", -10)
						.attr("class", (d) -> d.type)
						.call(force.drag)

				text = svg.append("svg:g").selectAll("g")
						.data(force.nodes())
					.enter().append("svg:g")
						.call(force.drag)

				text.append("svg:text")
					.attr("x", 0)
					.attr("width", 100)
					.attr("y", ".31em")
					.attr("text-anchor", "middle")
					.attr("class", (d) -> d.type)
					.text((d) -> d.name)
			)
	)
)
