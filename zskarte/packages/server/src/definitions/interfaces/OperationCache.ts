import { Connection } from '.';
import { Operation } from './collection-types';

export interface OperationCache {
  operation: Operation;
  connections: Connection[];
  mapState: object;
  mapStateChanged: boolean;
  lastUsed: number;
}
