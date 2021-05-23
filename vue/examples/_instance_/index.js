/* global Vue */

Vue.component('z-header', {
  template: `
    <div @click="update">{{component}}</div>
  `,
  data() {
    return {
      component: `zHeader`,
      parent: {
        child: 'child'
      }
    }
  },
  methods: {
    update() {
      debugger;
      this.component = 'zHeader-update'
    }
  }
});

new Vue({
  el: '#app',
  template: `
    <div>
      <span>
      {{id.name}}
      </span>
      <z-header></z-header>
    </div>
  `,
  data() {
    return {id: {
      name: 'gmz'
    }};
  }
});

