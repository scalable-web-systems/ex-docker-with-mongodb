import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';

const app = express();
const port = 3000;

async function connectDB(): Promise<MongoClient> {
  const uri = process.env.DATABASE_URL;

  if (uri === undefined) {
    throw Error('DATABASE_URL environment variable is not specified');
  }

  const mongo = new MongoClient(uri);
  await mongo.connect();
  return await Promise.resolve(mongo);
}

async function initDB(mongo: MongoClient) {
  const db = mongo.db();

  if (await db.listCollections({ name: 'products' }).hasNext()) {
    console.log('Collection already exists. Skipping initialization.');
    return;
  }

  const products = db.collection('products');
  const result = await products.insertMany([
    { kind: 'orange', count: 44 },
    { kind: 'banana', count: 33 },
    { kind: 'grapes', count: 19 },
  ]);

  console.log(`Initialized ${result.insertedCount} products`);
  console.log(`Initialized:`);

  for (let key in result.insertedIds) {
    console.log(`  Inserted product with ID ${result.insertedIds[key]}`);
  }
}

async function getProducts(mongo: MongoClient) {
  const products = mongo.db().collection('products');
  const result = products.find();

  const ret: { _id: string; kind: string; count: number }[] = [];

  await result.forEach((doc) => {
    ret.push({
      _id: doc._id.toHexString(),
      kind: doc.kind,
      count: doc.count,
    });
  });

  return ret;
}

async function start() {
  const mongo = await connectDB();
  await initDB(mongo);

  app.get('/', async (req: Request, res: Response) => {
    try {
      const products = await getProducts(mongo);
      res.send(products);
    } catch (e) {
      console.log(e);
      res.status(404).send('Products not available');
    }
  });

  app.listen(port, () => {
    console.log(`Running on ${port}.`);
  });
}

start();
