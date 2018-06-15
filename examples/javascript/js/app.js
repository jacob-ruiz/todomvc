/* Handlebars, Router */
(function() {
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');

			var todoTemplate = document.getElementById('todo-template');
			this.todoTemplate = Handlebars.compile(todoTemplate.innerHTML);

			var footerTemplate = document.getElementById('footer-template');
			this.footerTemplate = Handlebars.compile(footerTemplate.innerHTML);

			this.bindEvents();

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		bindEvents: function () {

			document.getElementById('new-todo')
				.addEventListener('keyup', this.create.bind(this));

			document.getElementById('toggle-all')
				.addEventListener('change', this.toggleAll.bind(this));

			document.getElementById('footer')
				.addEventListener('click', this.destroyCompleted.bind(this));

			/* Delegation:
			Add event listeners to #todo-list to handle events for child elements
			of #todo-list since child elements (e.g. '.destroy') may not be present
			when we are adding event listeners. By adding the event listeners to
			#todo-list, we can be sure the event is heard, run the appropriate
			method, and inside that method, check that the event happened on the
			appropriate element (example: only destroy a todo if the 'click' event
			was on the '.destroy' element specifically).
			*/
			document.getElementById('todo-list')
				.addEventListener('change', this.toggle.bind(this));
				// toggle method will check that the event happened on .toggle

			document.getElementById('todo-list')
				.addEventListener('dblclick', this.edit.bind(this));
				// edit method will check that the event happened on a <label>

			document.getElementById('todo-list')
				.addEventListener('keyup', this.editKeyup.bind(this));
				// editKeyup method will check that 'keyup' happened on '.edit'

			document.getElementById('todo-list')
				.addEventListener('focusout', this.update.bind(this));
				// update method will check that 'focusout' happened on '.edit'

			document.getElementById('todo-list')
				.addEventListener('click', this.destroy.bind(this));
				// destroy method will check that 'click' happened on '.destroy'
		},
		render: function () {
			var todos = this.getFilteredTodos();

			var todoListEl = document.getElementById('todo-list');
			todoListEl.innerHTML = this.todoTemplate(todos);

			var mainEl = document.getElementById('main');
			if (todos.length > 0) {
				mainEl.style.display = 'block';
			} else {
				mainEl.style.display = 'none';
			}

			var toggleAllEl = document.getElementById('toggle-all');
			toggleAllEl['checked'] = this.getActiveTodos().length === 0;

			this.renderFooter();

			document.getElementById('new-todo').focus();
			util.store('todos-jquery', this.todos);
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			var footer = document.getElementById('footer');
			if (todoCount > 0 ) {
				// show footer
				footer.style.display = 'block';
			} else {
				// hide footer
				footer.style.display = 'none';
			}
			// set contents of footer
			footer.innerHTML = template;
		},
		toggleAll: function (e) {
			var isChecked = e.target.checked;

			this.todos.forEach(function (todo) {
				todo.completed = isChecked;
			});

			this.render();
		},
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;
		},
		destroyCompleted: function (e) {
			// make sure this user clicked '#clear-completed' specifically,
			// not just anywhere in the footer.
			if (e.target.id === 'clear-completed') {
				this.todos = this.getActiveTodos();
				this.filter = 'all';
				this.render();
			}
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		indexFromEl: function (el) {
			var id = el.closest('li').dataset.id;
			var todos = this.todos;
			var i = todos.length;

			while (i--) {
				if (todos[i].id === id) {
					return i;
				}
			}
		},
		create: function (e) {
			var input = e.target;
			var val = input.value.trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			input.value = '';

			this.render();
		},
		toggle: function (e) {
			// Check that the user clicked on '#toggle' specifically
			if (e.target.className === 'toggle') {
				var i = this.indexFromEl(e.target);
				this.todos[i].completed = !this.todos[i].completed;
				this.render();
			}
		},
		edit: function (e) {
			// Check that the 'dblclick' was on the <label> element
			if (e.target.tagName === 'LABEL') {
				// Get the dblclicked element (should be a <label>)
				var element = e.target;
				// Get the <li> it belongs to (look up the ancestor tree.)
				var li = element.closest('li');
				// Add class 'editing' to the <li> for styling.
				li.classList.add('editing');
				// Find a child of <li> with selector '.edit' (should be an <input>).
				// Save that <input> as var input.
				var input = li.querySelector('.edit');
				// Note: The old code set input.value to input.value()
				// I don't see the purpose of this, and works without it,
				// so I've removed it.
				// apply focus to input
				input.focus();
			} // otherwise do nothing.
		},
		editKeyup: function (e) {
			// Check that the event was on the '.edit' class specifically.
			if (e.target.classList.contains('edit')) {
				var el = e.target;
				if (e.which === ENTER_KEY) {
					el.blur();
				}

				if (e.which === ESCAPE_KEY) {
					el.dataset.abort === true;
					el.blur();
				}
			}
		},
		update: function (e) {
			// Check that the 'focusout' event was on the '.edit' class specifically.
			if (e.target.classList.contains('edit')) {
				var el = e.target;
				var val = el.value.trim();

				if (!val) {
					this.destroy(e);
					return;
				}

				if (el.dataset.abort === true) {
					el.dataset.abort === false;
				} else {
					this.todos[this.indexFromEl(el)].title = val;
				}

				this.render();
			}
		},
		destroy: function (e) {
			// Check that the click was specifically on the .destroy class
			if (e.target.classList.contains('destroy')) {
				this.todos.splice(this.indexFromEl(e.target), 1);
				this.render();
			}
		}
	};

	App.init();
})();
