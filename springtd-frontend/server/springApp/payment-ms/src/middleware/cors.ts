import cors from 'cors';
import { CorsOptions } from 'cors';
import { config } from '../config/environment';

const corsOptions: CorsOptions = {
  origin: config.corsOrigins,
  credentials: true,
  optionsSuccessStatus: 200
};

export { corsOptions };
export default cors(corsOptions);
