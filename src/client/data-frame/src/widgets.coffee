define(['data-frame/widgets/text', 'data-frame/widgets/textArea', 'data-frame/widgets/foreignKey', 'data-frame/widgets/integer', 'data-frame/widgets/boolean'], (text, textArea, foreignKey, integer, boolean) ->
	widgets = {}
	widgets.text = text
	widgets.textArea = textArea
	widgets.foreignKey = foreignKey
	widgets.integer = integer
	widgets.boolean = boolean
	
	return (widgetType, action, id, value, foreignKeys = []) ->
		switch(widgetType)
			when 'Short Text', 'Value'
				return text(action, id, value)
			when 'Long Text'
				return textArea(action, id, value)
			when 'Date', 'Date Time', 'Time'
				return 'TODO'
			when 'Interval'
				return 'TODO'
			when 'Real'
				return 'TODO'
			when 'Integer'
				return integer(action, id, value)
			when 'Boolean'
				return boolean(action, id, value)
			when 'ConceptType', 'ForeignKey'
				return foreignKey(action, id, value, foreignKeys)
			when 'Serial'
				if value != ''
					return value
				return '?'
			else
				console.error('Hit default, wtf?', widgetType)
)