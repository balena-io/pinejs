import * as _express from 'express';
import * as prometheus from 'prom-client';
import * as expressPrometheus from 'express-prom-bundle';

import { dbMetricsEvents } from '../database-layer/db'

export interface MetricsSpec {
	defaults: boolean,
	reqLatency: number[],
	dbQueryLatency: number[],
	oDataToSQLCacheSaturation: number[],
	dbPoolQueueSaturation: number[]
}

interface QueryCompleteEvent {
	time: number,
	query: string
}

export const attachMetrics = (spec: MetricsSpec, app: _express.Application) => {
	// collect defaults?
	if (metrics.collectDefaultMetrics) {
		prometheus.collectDefaultMetrics({ timeout: 5000 });	
	}
	// collect request latency (via middleware)
	app.use(expressPrometheus({
		includeMethod: true, 
		buckets: metrics.reqLatency
	}));
	// collect DB metrics
	const queryEvents = {};
	const dbPoolQueueSaturation = new prometheus.Histogram({
		name: 'dbPoolQueueSaturation',
		help: 'percentage fill of db pool queue',
		buckets: metrics.dbPoolQueueSaturation
	});
	dbQueryEventEmitter.on('dbQueueSaturation', (p: number) => {
		dbPoolQueueSturation.observe(p);
	});
	const dbQueryLatency = new prometheus.Histogram({
		name: 'dbQueryLatency',
		help: 'latency of DB queries',
		buckets: metrics.dbQueryLatency
	});
	dbQueryEventEmitter.on('queryComplete', (e: QueryCompleteEvent) => {
		// metrics-TODO: for now, we discard the query string
		dbQueryLatency.observe(e.time);
	});
	// metrics-TODO: attach metrics to the oData->SQL memoize cache
}
