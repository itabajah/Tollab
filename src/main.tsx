import { render } from 'preact';
import { App } from './App';
import './css/base.css';
import './css/layout.css';
import './css/components.css';
import './css/calendar.css';
import './css/modals.css';
import './css/toast.css';
import './css/utils.css';

render(<App />, document.getElementById('app')!);
