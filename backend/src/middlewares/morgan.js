import morgan from 'morgan';

const morganFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : 'dev';

export default morgan(morganFormat);