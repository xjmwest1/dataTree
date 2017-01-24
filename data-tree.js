(function() {

	var cssString = 
		'<style>																												'+
		'	data-tree node.expandable::before {														'+
		'		content: "\\25b6";																					'+
		'		position: absolute;																					'+
		'		left: 0px;																									'+
		'		font-size: 10px;																						'+
		'		-webkit-transition: -webkit-transform .1s ease;							'+
		'		transition: -webkit-transform .1s ease;											'+
		'		transition: transform .1s ease;															'+
		'		transition: transform .1s ease, -webkit-transform .1s ease;	'+
		'	}																															'+
		'	data-tree .expandable {																				'+
		'		position: relative;																					'+
		'	}																															'+
		'	data-tree node.expandable.expanded::before {									'+
		'		-webkit-transform: rotate(90deg);														'+
		'       transform: rotate(90deg);																'+
		'	}																															'+
		'	data-tree .expandable::before,																'+
		'	data-tree .expandable > .keyContainer > .key {								'+
		'		cursor: pointer;																						'+
		'	}																															'+
		'	data-tree .not-expandable {																		'+
		'		cursor: initial;																						'+
		'	}																															'+	
		'	data-tree ul {																								'+
		'		list-style: none;																						'+
		'	}																															'+
		'	data-tree li {																								'+
		'		line-height: 1.5em;																					'+
		'	}																															'+
		'	data-tree .keyContainer {																			'+
		'		font-size: 0;																								'+
		'	}																															'+
		'	data-tree .key {																							'+
		'		color: #6cb5de;																							'+
		'		font-size: initial;																					'+
		'	}																															'+
		'	data-tree .key:first-of-type {																'+
		'		padding-left: 15px;																					'+
		'	}																															'+
		'	node:not(.expanded) > .bracket {															'+
		'		margin-left: -4px;																					'+
		'	}																															'+	
		'	node.expanded > .bracket {																		'+
		'		margin-left: 15px;																					'+
		'	}																															'+		
		'	data-tree .keyContainer .bracket {														'+
		'		padding-left: 5px;																					'+
		'	}																															'+	
		'	data-tree .value {																						'+
		'		padding-left: .8rem;																				'+
		'		padding-right: .8rem;																				'+
		'		color: #004b87;																							'+
		'		font-size: initial;																					'+
		'	}																															'+
		'	data-tree .preview {																					'+
		'		padding-left: .4rem;																				'+
		'		padding-right: .4rem;																				'+
		'		color: darkgrey;																						'+
		'		font-size: initial;																					'+
		'	}																															'+
		'</style>																												';
	
	var utils = {
		isXml: function(obj) {
			// Sizzle.isXML
			// https://github.com/jquery/sizzle/blob/2e664828f3e0a17d70ef4bf69322e06da04eb406/sizzle.js#L1407
			// documentElement is verified for cases where it doesn't yet exist
			// (such as loading iframes in IE - #4833) 
			var documentElement = (obj ? obj.ownerDocument || obj : 0).documentElement;

			return documentElement ? documentElement.nodeName !== 'HTML' : false;
		},
		isNotEmptyObject: function(obj) {
			return angular.isObject(obj) && Object.keys(obj).length > 0;
		}
	}

	angular.module('data-tree', [])
		.directive('tree', tree)
		.directive('node', node);
	
			
	tree.$inject = [];
		
	function tree() {
		var directive = {
			restrict: 'E',
			scope: {
				object: '=',
				startExpanded: '&?',
				jsonRoot: '&?',
				xmlRoot: '&?'
			},
			link: function(scope, element, attrs) {
				scope.$watch('object', function() {
					scope.rootName = (utils.isXml(scope.object) ? scope.xmlRoot() : scope.jsonRoot()) || '';
				});
			},
			template: cssString + '<node key="rootName" value="object" start-expanded="startExpanded"></node>'
		};

		return directive;
	}

	node.$inject = [];
		
	function node() {
		var directive = {
			restrict: 'E',
			scope: {
				key: '=',
				value: '=',
				startExpanded: '&?'
			},
			link: function(scope, element, attrs) {
					
				if (scope.startExpanded && scope.startExpanded()) {
					element.addClass('expanded');
				}
				scope.isExpanded = scope.startExpanded ? scope.startExpanded() : false;
				
				scope.toggleExpanded = function() {
					if(scope.isExpandable) {
						scope.isExpanded = !scope.isExpanded;
						if (scope.isExpanded) {
							element.addClass('expanded');
						} else {
							element.removeClass('expanded');
						}
					}
				};
					
				var changedInternally = false;
				scope.$watch('value', function() {
						
					if(changedInternally) {
						changedInternally = false;
					}else {
						scope.isLeaf = false;
						
						if(scope.value) {
							scope.isXml = utils.isXml(scope.value);
							
							var children;
							if(scope.isXml) {
								children = (scope.value.documentElement ? scope.value.documentElement.childNodes : scope.value.childNodes) || [];
								if(children.length > 0 && !(children.length == 1 && children[0].nodeName === '#text')) {
									scope.children = [];
									for (var i = 0; i < children.length; i++) {
										var child = children[i];
										scope.children.push({
											key: child.nodeName,
											value: child
										});
									}
								}else {
									scope.isLeaf = true;
									changedInternally = true;
									if(children.length == 1) {
										scope.value = children[0].textContent;
									}else {
										scope.value = scope.value.textContent;
									}
								}
							}else {
								if(angular.isArray(scope.value)) {
									scope.jsonOpenBracket = '[';
									scope.jsonCloseBracket = ']';
								}else if(angular.isObject(scope.value)) {
									scope.jsonOpenBracket = '{';
									scope.jsonCloseBracket = '}';
								}
								
								if(utils.isNotEmptyObject(scope.value)) {
									children = Object.keys(scope.value) || [];
									if(children.length > 0) {
										scope.children = children.map(function(key) {
									return {
										key: key,
										value: scope.value[key]
									}
								});
									}
								}else {
									scope.isLeaf = true;
									if(angular.isObject(scope.value)) {
										changedInternally = true;
										scope.value = ' ';
									}
								}
							}
							
							scope.children = scope.children || [];
							
							var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
							
							scope.children.sort(function(a, b) {
								var compare = (a.key || '').localeCompare((b.key || ''), undefined, {numeric: true, sensitivity: 'base'});
								return compare;
							});
							
							if(scope.children.length > 0 && scope.key) {
								scope.isExpandable = true;
								element.addClass('expandable');
							}else {
								scope.isExpandable = false;
								element.addClass('not-expandable');
							}
						}else {
							scope.isLeaf = true;
						}
					}

				}, true);
					
			},
			template: 	'<span class="keyContainer" ng-click="toggleExpanded()">																		'+
									'		<span class="key" ng-if="isXml">&lt;</span>																							'+
									'		<span class="key">{{key}}</span>																												'+
									'		<span class="key" ng-if="isXml">&gt;</span>																							'+
									'		<span class="key" ng-if="!isXml && key">:</span>																				'+
									'		<span class="key bracket" ng-if="!isXml && jsonOpenBracket">{{jsonOpenBracket}}</span>	'+
									'		<span class="value" ng-if="isLeaf && value">{{value}}</span>														'+
									'		<span class="preview" ng-if="isLeaf && !value && !isXml">null</span>										'+
									'		<span class="key" ng-if="isXml && isLeaf">&lt;/{{key}}&gt;</span>												'+
									'</span>																																										'+
									'<ul ng-if="children && children.length > 0" ng-show="isExpanded">													'+
									'		<li ng-repeat="child in children">																											'+
									'			<node key="child.key" value="child.value" start-expanded="startExpanded"></node>			'+
									'		</li>																																										'+
									'</ul>																																											'+
									'<span class="preview" ng-if="isExpandable && !isExpanded">...</span>												'+
									'<span class="key bracket" ng-if="!isXml && jsonCloseBracket">{{jsonCloseBracket}}</span>		'+
									'<span class="key" ng-if="isXml && !isLeaf">&lt;/{{key}}&gt;</span>													'
		};
	
		return directive;
	}
	
})();