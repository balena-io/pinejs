define(['data-frame/widgets/text', 'data-frame/widgets/textArea', 'data-frame/widgets/foreignKey', 'data-frame/widgets/integer', 'data-frame/widgets/boolean'], (text, textArea, foreignKey, integer, boolean) ->
	widgets = {}
	widgets.text = text
	widgets.textArea = textArea
	widgets.foreignKey = foreignKey
	widgets.integer = integer
	widgets.boolean = boolean
	return widgets
)