import {
  GET_EXECUTORS,
  EXECUTOR_ADDED
} from "../../../constants/MesosStreamMessageTypes";
import { scalar } from "./ProtobufUtil";

function processExecutor({ agent_id, executor_info }) {
  const executor = { agent_id, ...executor_info };
  executor.id = scalar(executor.executor_id);
  executor.agent_id = scalar(executor.agent_id);
  executor.framework_id = scalar(executor.framework_id);

  return executor;
}

export function getExecutorsAction(state, message) {
  if (message.type !== GET_EXECUTORS) {
    return state;
  }

  const executors = (message.get_executors.executors || [])
    .map(processExecutor);

  return Object.assign(state, { executors });
}

export function executorAddedAction(state, message) {
  if (message.type !== EXECUTOR_ADDED) {
    return state;
  }

  const executor = processExecutor(message.executor_added.executor);

  return Object.assign(state, { executors: [...state.executors, executor] });
}
