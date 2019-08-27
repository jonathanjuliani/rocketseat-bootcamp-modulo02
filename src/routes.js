import { Router } from 'express';
// import User from './app/models/User';
import UserController from './app/controllers/UserController';

const routes = new Router();

// routes.get('/', async (req, res) => {
//   const response = await User.create({
//     name: 'Jonathan Juliani',
//     email: 'jonathanjuliani@outlook.com',
//     password_hash: '123456789',
//   });
//   return res.json(response);
// });

routes.post('/users', UserController.store);

export default routes;
