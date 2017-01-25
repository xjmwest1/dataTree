(function() {
	'use strict'

	var css = `
		data-tree {
			display: block;
			padding: .5rem;
		}

		data-tree node {
			font-size: 0;
		}

		data-tree span:not(.keyContainer):not(.hoverContainer) {
			font-size: initial;
		}

		data-tree ul {
			list-style: none;
			line-height: 1.15;
			margin: 0;
			padding-left: 40px;
		}

		data-tree .arrow {
			height: 10px;
			width: auto;
			margin-right: 5px;
			fill: currentColor;
			-webkit-transition-duration: .25s;
    	transition-duration: .25s;
		}

		data-tree node.expanded > .keyContainer > .hoverContainer > .arrow {
			-webkit-transform: rotate(90deg);
			transform: rotate(90deg);	
		}

		data-tree .keyContainer {
			display: inline-block;
			font-size: 0;
		}

		data-tree .hoverContainer {
			display: inline-block;
			padding: 2px 0 4px 5px;
			font-size: 0;
		}

		data-tree node.expandable > .keyContainer > .hoverContainer:hover {
			background: rgba(100, 100, 100, .10);
			border-radius: 5px;
		}

		data-tree node.expandable > .keyContainer {
			cursor: pointer;
		}

		data-tree node .startBracket {
			margin-left: 5px;
		}

		data-tree node.expanded > .endBracket {
			margin-left: 15px;
		}

		data-tree .ellipsis {
			display: inline-block;
			width: 20px;
			text-align: center;
		}

		data-tree .jsonValue {
			margin-left: 5px;
		}
	`;
	
	var DEFAULT_STYLES = {
		key: {
			color: 'gray'
		},
		value: {
			color: '#000'
		},
		arrow: {
			color: 'gray'
		}
	};

	angular.module('data-tree', [])
		.directive('tree', tree)
		.directive('node', node)
		.factory('x2jsProvider', x2jsProvider);
	
	const treeTemplate = `<style>` + css + `</style>
		<node key="'root'" value="object" is-xml="isXml" ng-if="object" styles="styles"></node>
	`;
	
	tree.$inject = ['$timeout', 'x2jsProvider'];
	
	function tree($timeout, x2jsProvider) {
		var directive = {
			restrict: 'E',
			scope: {
				externalObject: '=object',
				externalStyles: '=?styles'
			},
			link: function(scope, element, attrs) {			
				// handle external object updating
				scope.$watch('externalObject', function(externalObject) {
					if(externalObject) {
						scope.object = null;
						scope.isXml = isXml(externalObject);
						
						if(isXml(externalObject)) {
							x2jsProvider.then(function(x2js) {
								$timeout(function() {
									scope.object = angular.copy(x2js.xml2json(externalObject));
								});
							});
						}else {
							$timeout(function() {
								scope.object = angular.copy(externalObject);
							});
						}
					}
				});
				
				// handle external styles object updating
				scope.$watch('externalStyles', function(styles) {
					var tmpStyles = {
						key: {},
						value: {},
						arrow: {}
					};
					
					if(styles) {
						Object.keys(tmpStyles).forEach(function(elem) {
							Object.keys(DEFAULT_STYLES[elem]).forEach(function(prop) {
								tmpStyles[elem][prop] = styles[elem][prop] || DEFAULT_STYLES[elem][prop];
							});
						});
					}else {
						tmpStyles = DEFAULT_STYLES;
					}
					
					scope.styles = angular.copy(tmpStyles);
				}, true);
				
				function isXml(obj) {
					// Sizzle.isXML
					// https://github.com/jquery/sizzle/blob/2e664828f3e0a17d70ef4bf69322e06da04eb406/sizzle.js#L1407
					var documentElement = (obj ? obj.ownerDocument || obj : 0).documentElement;
					return documentElement ? documentElement.nodeName !== 'HTML' : false;
				}
			},
			template: treeTemplate
		};

		return directive;
	}

	
	const nodeTemplate = `
		<span class="keyContainer" ng-click="toggleExpanded()">
			<span class="hoverContainer">
				<svg class="arrow" ng-style="styles.arrow" ng-if="!isLeaf" viewBox="0 0 306 306" style="enable-background:new 0 0 306 306;">
					<polygon points="94.35,0 58.65,35.7 175.95,153 58.65,270.3 94.35,306 247.35,153"/>
				</svg>
				<span ng-style="styles.key" ng-if="isXml">&lt;</span>
				<span ng-style="styles.key">{{key}}</span>
				<span ng-style="styles.key" ng-if="isXml">&gt;</span>
				<span ng-style="styles.key" ng-if="!isXml">:</span>
			</span>
			<span class="startBracket" ng-style="styles.value" ng-if="!isXml && startBracket">{{startBracket}}</span>
			<span ng-class="{jsonValue: !isXml}" ng-style="styles.value" ng-if="isLeaf">{{value}}</span>
		</span>
		<span class="ellipsis" ng-style="styles.value" ng-if="!isLeaf" ng-hide="isExpanded"> ... </span>
		<ul ng-if="!isLeaf" ng-show="isExpanded">
			<li ng-repeat="child in children">
				<node key="child.key" value="child.value" styles="styles" is-xml="isXml"></node>
			</li>
		</ul>
		<span ng-style="styles.key" ng-if="isXml">&lt;/{{key}}&gt;</span>
		<span class="endBracket" ng-style="styles.value" ng-if="!isXml && endBracket">{{endBracket}}</span>
	`;
	
	node.$inject = [];
	
	function node() {
		var directive = {
			restrict: 'E',
			scope: {
				key: '=',
				value: '=',
				styles: '=',
				isXml: '='
			},
			link: function(scope, element, attrs) {
				
				if(angular.isArray(scope.value)) {
					scope.startBracket = '[';
					scope.endBracket = ']';
					scope.children = scope.value.map(function(item, index) {
						return {
							key: index,
							value: item
						};
					});
				}else if(angular.isObject(scope.value)) {
					scope.startBracket = '{';
					scope.endBracket = '}';
					scope.children = Object.keys(scope.value).map(function(item) {
						return {
							key: item,
							value: scope.value[item]
						};
					});
				}
				
				scope.isLeaf = (!scope.children || scope.children.length <= 0);
				scope.isExpanded = true;
				scope.isLeaf ? element.removeClass('expandable') : element.addClass('expandable');
				scope.isExpanded ? element.addClass('expanded') : element.removeClass('expanded');
				
				scope.toggleExpanded = function() {
					scope.isExpanded = !scope.isExpanded;
					scope.isExpanded ? element.addClass('expanded') : element.removeClass('expanded');
				}
				
			},
			template: nodeTemplate
		};
	
		return directive;
	}
	
	x2jsProvider.$inject = ['$interval', '$q'];
	
	function x2jsProvider($interval, $q) {
		var deferred = $q.defer();
		
		if(typeof(X2JS) === "undefined") {
			var wf = document.createElement('script');
			wf.src = 'xml2json.min.js';
			wf.type = 'text/javascript';
			wf.async = 'false';
			document.head.appendChild(wf);
		}
		
		var check = $interval(function() {
			if(X2JS) {
				$interval.cancel(check);
				deferred.resolve(new X2JS());
			}
		}, 250);
		
		return deferred.promise;
	}
	
})();