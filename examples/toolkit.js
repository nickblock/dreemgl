define.class("$server/composition",function(require, $ui$, icon, label, view, screen, cadgrid, $widgets$, toolkit) {
	
	this.render = function() {
		return [
			screen(
				{flexdirection:"row", position:'absolute', x:1483.0421142578125, y:0, width:NaN, height:NaN},
				cadgrid({
						name:"grid", 
						flex:3, 
						overflow:"scroll", 
						bgcolor:"#4e4e4e", 
						gridsize:8, 
						majorevery:5, 
						majorline:vec4(0.34117648005485535,0.34117648005485535,0.34117648005485535,1), 
						minorline:vec4(0.2823529541492462,0.2823529541492462,0.2823529541492462,1), 
						alignitems:'center', 
						alignself:'stretch', 
						flexdirection:'column', 
						justifycontent:'center', 
						anchor:vec3(0,0,0), 
						toolmove:false
					},
					view({height:327, width:448, bgcolor:vec4(0,0.501960813999176,0.03174766153097153,1), position:'absolute', x:124.7498779296875, y:61.99993896484375},view({height:114, width:112, bgcolor:vec4(1,0.9209829568862915,0.2225802093744278,1), position:'absolute', x:115.7501220703125, y:70.99996185302734, borderwidth:vec4(1,0,0,0)}),label({fontsize:70, bgcolor:'transparent', fgcolor:'lightgreen', text:'Howdy!', position:'absolute', x:149.9998321533203, y:171.00006103515625, width:NaN, height:NaN, rotate:vec3(0,0,0)})),
					view({height:150, width:187, bgcolor:vec4(0.8890466094017029,0.514293909072876,0.6321912407875061,1), position:'absolute', x:772, y:451.99993896484375, borderradius:vec4(11,7,2,16)}),
					label({fontsize:24, bgcolor:'transparent', fgcolor:'lightgreen', text:'Howdy!', position:'absolute', x:457, y:486}),
					view({height:250, width:305, bgcolor:vec4(0,0.501960813999176,0.4905743896961212,1), position:'absolute', x:658.0000610351562, y:49},icon({fgcolor:vec4(0.9129186868667603,0.9196687936782837,0.9317914843559265,1), icon:'flask', position:'absolute', x:151.9998779296875, y:-7.999992370605469, fontsize:80})),
					icon({fgcolor:'cornflower', icon:'flask', position:'absolute', x:690, y:418}),
					view({height:60, width:60, bgcolor:'purple', position:'absolute', x:186.99996948242188, y:500}),
					icon({fgcolor:'cornflower', icon:'flask', position:'absolute', x:621, y:457}),
					label({fontsize:24, bgcolor:'transparent', fgcolor:'lightgreen', text:'Howdy!', position:'absolute', x:392, y:428}),
					icon({fgcolor:'cornflower', icon:'flask', position:'absolute', x:317, y:451})
				),
				toolkit()
			)
		]
	}
}
)