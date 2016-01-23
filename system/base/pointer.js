/* Copyright 2015 Teem2 LLC. Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
   You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0 Unless required by applicable law or agreed to in writing,
   software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
   either express or implied. See the License for the specific language governing permissions and limitations under the License.*/

define.class('$system/base/node', function(){
	this.atConstructor = function(){}

	this.attributes = {
		// event api
		start:Config({type:Event}),
		move:Config({type:Event}),
		hover:Config({type:Event}),
		end:Config({type:Event}),
		tap:Config({type:Event}),

		//
		// wheelx: Config({type:int}),
		// wheely: Config({type:int}),
		// zoom: Config({type:int})

	}
})