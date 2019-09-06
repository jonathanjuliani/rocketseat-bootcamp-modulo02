module.exports = {
  up: queryInterface => {
    return queryInterface.bulkInsert(
      'users',
      [
        {
          name: 'Jonathan Juliani',
          email: 'jonathanjuliani@teste.com.br',
          password_hash:
            '$2a$08$5W9QnzGP7ZqPUONRKojih.zl1IQa2HWRgM1hrhofJVKefON4sdVby',
          provider: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: 'Provider Teste',
          email: 'providerteste@teste.com.br',
          password_hash:
            '$2a$08$5W9QnzGP7ZqPUONRKojih.zl1IQa2HWRgM1hrhofJVKefON4sdVby',
          provider: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {}
    );
  },

  down: queryInterface => {
    return queryInterface.bulkDelete('users', null, {});
  },
};
