import { MongoClient } from 'mongodb';
import config from 'config';
import path from "path";

interface DbConfig{
  url: string;
  tls?: boolean
}

const { url, tls }: DbConfig = config.get('db');

export const Client = new MongoClient(`${url}${tls ? `&tls=true&tlsCAFile=${path.join(__dirname, './ca-certificate.crt')}` : ''}`, { useNewUrlParser: true, useUnifiedTopology: true });
