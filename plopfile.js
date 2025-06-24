module.exports = function (plop) {
  plop.setGenerator('component', {
    description: 'Create a new React component',
    prompts: [{
      type: 'input',
      name: 'name',
      message: 'Component name:'
    }],
    actions: [
      {
        type: 'add',
        path: 'components/{{name}}/{{name}}.tsx',
        templateFile: 'plop-templates/component/component.hbs'
      },
      {
        type: 'add',
        path: 'components/{{name}}/{{name}}.stories.tsx',
        templateFile: 'plop-templates/component/component.stories.hbs'
      },
      {
        type: 'add',
        path: 'components/{{name}}/{{name}}.test.tsx',
        templateFile: 'plop-templates/component/component.test.hbs'
      },
      {
        type: 'add',
        path: 'components/{{name}}/index.ts',
        templateFile: 'plop-templates/component/index.hbs'
      }
    ]
  });
}; 