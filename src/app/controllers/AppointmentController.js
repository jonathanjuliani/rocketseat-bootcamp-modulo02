import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import Appointment from '../models/Appointment';
import File from '../models/File';
import Notification from '../schemas/Notification';
import Mail from '../../lib/Mail';
import Queue from '../../lib/Queue';
import CancellationMail from '../jobs/CancellationMail';

class AppointmentController {
  async index(req, res) {
    const { page } = req.query;
    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        // canceled_at: null,
      },
      order: ['date'],
      attributes: ['id', 'date', 'canceled_at', 'past', 'cancelable'],
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
      date,
    });

    const { name } = await User.findByPk(req.userId);
    const formatedDate = format(startHour, "'dia' dd 'de' MMMM', às' H:mm'h'", {
      locale: pt,
    });

    await Notification.create({
      content: `Você tem um novo agendamento de ${name} para ${formatedDate}.`,
      user: provider_id,
    });
    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        { model: User, as: 'provider', attributes: ['name', 'email'] },
        { model: User, as: 'user', attributes: ['name'] },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({ error: 'Não autorizado. ' });
    }

    const earlierDate = subHours(appointment.date, 2);

    if (isBefore(earlierDate, new Date())) {
      return res.status(401).json({
        error:
          'Não é possível cancelar agendamentos - sem multa - com menos de 2h de antecedência.',
      });
    }

    appointment.canceled_at = new Date();
    await appointment.save();

    await Queue.add(CancellationMail.key, { appointment });

    return res.json(appointment);
  }
}

export default new AppointmentController();
