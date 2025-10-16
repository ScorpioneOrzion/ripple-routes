/// <reference path="./virtual.ts" />

import { System } from './system';
import { rippleRouter } from './plugin';

import routes from 'virtual:ripple-routes';
const paths = Object.keys(routes);

const root = new System({
	initial: paths.map(path => ['/' + path as `/${string}`, routes[path]])
})

export { rippleRouter, System, root }