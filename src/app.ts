import express from 'express';
import cors from 'cors';
import { errorHandler } from './libs/error';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRouter } from './routes/auth.route';
import { indicatorRouter } from './routes/indicator.route';
import { companyRouter } from './routes/company.route';



const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));;

app.use('/auth',authRouter);

// health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// indicator endpoints
app.use( indicatorRouter);

// company endpoints
app.use( companyRouter);
// error middleware
app.use(errorHandler)

// (อาจมี: /v1/resolve/company, /v1/autocomplete/company )
const PORT = process.env.PORT || 4545;
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
