// Polyfills (URL e FormData) tem que ser o PRIMEIRO import de TODO o app,
// antes de expo/App/qualquer outra lib que possa usar. Sem isso, Hermes
// em release build crasha com "Property 'FormData' doesn't exist".
import './polyfills';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
