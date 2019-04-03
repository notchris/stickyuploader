const {ipcRenderer} = require('electron')

let app = new Vue({
    el: '#app',
    data: {
    	userEmail: null,
    	userPass: null,
    	updated: false
    },
    mounted() {
    	console.log('ok')
    },
    watch: {
    	userEmail: function(){
    		this.updated = false;
    	},
    	userPass: function(){
    		this.updated = false;
    	},
    },
    methods: {
    	update(event) {
    		event.preventDefault();
    		ipcRenderer.send('update-account', JSON.stringify({email: this.userEmail, pass: this.userPass}), 10);
    		this.updated = true;
    	}
    }
})