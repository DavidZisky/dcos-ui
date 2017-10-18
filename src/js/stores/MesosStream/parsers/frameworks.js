import {
  GET_FRAMEWORKS,
  FRAMEWORK_ADDED
} from "../../../constants/MesosStreamMessageTypes";
import { scalar } from "./ProtobufUtil";

function processFramework({ framework_info, ...rest }) {
  const framework = { ...framework_info, ...rest };
  framework.id = scalar(framework_info.id);

  return framework;
}

export function getFrameworksAction(state, message) {
  if (message.type !== GET_FRAMEWORKS) {
    return state;
  }

  const frameworks = Object.keys(message.get_frameworks).reduce((acc, key) => {
    return acc.concat(message.get_frameworks[key].map(processFramework));
  }, []);

  return Object.assign({}, state, { frameworks });
}

export function frameworkAddedAction(state, message) {
  if (message.type !== FRAMEWORK_ADDED) {
    return state;
  }

  const framework = processFramework(message.framework_added.framework);

  return Object.assign(state, { frameworks: [...state.frameworks, framework] });
}
