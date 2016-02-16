/* Copyright 2015-2016 Teeming Society. Licensed under the Apache License, Version 2.0 (the "License"); DreemGL is a collaboration between Teeming Society & Samsung Electronics, sponsored by Samsung and others.
   You may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
   Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
   either express or implied. See the License for the specific language governing permissions and limitations under the License.*/

define.class('$ui/view', function (events, $ui$, view, scrollbar) {

	this.fgcolor = 'black'

	this.attributes = {
		zoom: Config({type: Number, value: wire('this.parent.zoom')}),
		scroll: wire('this.parent.scroll'),
		hoursegs: Config({type: Number, value: 24})
	}

	this.layout = function(){
		this.layout.top = 0
		this.layout.height = this.parent.layout.height
	}

	this.hardrect = function(){
		this.makepattern = function (field, repeat, zoom) {
			var f = field * repeat
			if (mod(f, 1.0) < 1.0 / view.layout.width * zoom * repeat) {
				return 0.75
			} else if (math.odd(f - mod(f, 1.0))) {
				return 1.0
			} else {
				return 0.9
			}
		}
		this.color = function(){
			var col = vec4()
			var fill = vec4(0.098, 0.098, 0.098, 1)
			var a = 24.0 / view.layout.height
			var b = 48.0 / view.layout.height
			var c = 72.0 / view.layout.height
			// horizontal dividers
			if (abs(uv.y - a) < 0.5 / view.layout.height ||
			abs(uv.y - b) < 0.5 / view.layout.height ||
			abs(uv.y - c) < 0.5 / view.layout.height) {
				return vec4(0.75, 0.75, 0.75, 1.0)
			}
			var zoom = view.zoom
			var dayfield = (uv.x + view.scroll.x) * view.zoom
			var hour = makepattern(dayfield, view.hoursegs, zoom)
			var day = makepattern(dayfield, 1, zoom)
			var week = makepattern(dayfield, 1.0 / 7, zoom) // TODO: breaks without point!
			var month = makepattern(dayfield, 1.0 / 31, zoom)
			var pattern = week;
			if (uv.y < a) {
				pattern = month
			} else if (uv.y < b) {
				pattern = week * day
			} else if (uv.y < c) {
				pattern = hour
			} else {
				pattern = hour
				fill = vec4(0.8, 0.8, 0.8, 1)
			}
			// TODO(aki): crossfade patterns
			return mix(fill, 'white', pattern)
		}
	}

})