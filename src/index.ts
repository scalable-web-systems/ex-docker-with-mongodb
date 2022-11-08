import express, { Request, Response } from 'express';

const app = express();
const port = 3000;

interface Message {
  message: string
}

app.get('/', (req: Request, res: Response) => {
  const msg: Message = { 'message': 'ok' };
  res.send(msg);
});

app.listen(port, () => {
  console.log(`Running on ${port}.`);
});