import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import User from '../models/User';
import Appointment from '../models/Appointment';
import File from '../models/File';

class AppointmentController {
  async index(req, res) {
    const { page } = req.query;
    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        // canceled_at: null,
      },
      order: ['date'],
      attributes: ['id', 'date', 'canceled_at'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });

    res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res
        .status(400)
        .json({ error: 'Ocorreu um erro na validação dos campos.' });
    }

    const { provider_id, date } = req.body;

    // check if id refers to a real provider

    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return res
        .status(401)
        .json({ error: 'Provider escolhido não é um provider cadastrado.' });
    }

    // verificando se a data de agendamento já passou
    const startHour = startOfHour(parseISO(date));

    if (isBefore(startHour, new Date())) {
      return res
        .status(400)
        .json({ error: 'Essa data já passou...escolha outra data.' });
    }

    // verificando se a data escolhida esta disponivel

    const dateNotAvailable = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: startHour,
      },
    });

    if (dateNotAvailable) {
      return res
        .status(400)
        .json({ error: 'Data não disponível para agendamento.' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: parseISO(date),
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
