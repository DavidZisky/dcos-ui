import {
  SET
} from '../../../../../../src/js/constants/TransactionTypes';
import {COMMAND, HTTP, HTTPS, TCP} from '../../constants/HealtCheckProtocols';
import Transaction from '../../../../../../src/js/structs/Transaction';

function intOrNull(value) {
  if ((value === '') || (value === null) || (value === undefined)) {
    return null;
  }

  return parseInt(value);
}

/**
 * JSON Parser Fragment for `HttpHealthCheck` type
 *
 * @param {Object} healthCheck - The healthcheck data to parse
 * @param {Array} path - The path prefix to the transaction
 * @param {Array} memo - The memo object where to append the transations
 */
function parseHttpHealthCheck(healthCheck, path, memo) {
  if (healthCheck.endpoint != null) {
    memo.push(new Transaction(
      path.concat(['endpoint']),
      healthCheck.endpoint,
      SET
    ));
  }

  if (healthCheck.path != null) {
    memo.push(new Transaction(
      path.concat(['path']),
      healthCheck.path,
      SET
    ));
  }

  if (healthCheck.scheme != null) {
    memo.push(new Transaction(
      path.concat(['https']),
      healthCheck.scheme === HTTPS,
      SET
    ));
  }
}

function reduceHttpHealthCheck(newState, field, value) {
  switch (field) {
    case 'endpoint':
      newState.http.endpoint = value;
      break;

    case 'path':
      newState.http.path = value;
      break;

    case 'https':
      if (value) {
        newState.http.scheme = HTTPS;
      } else {
        newState.http.scheme = null;
      }
      break;
  }
}

function reduceFormHttpHealthCheck(newState, field, value) {
  switch (field) {
    case 'https':
      newState.http.https = value;
      break;
  }
}

/**
 * JSON Parser Fragment for `TcpHealthCheck` type
 *
 * @param {Object} healthCheck - The healthcheck data to parse
 * @param {Array} path - The path prefix to the transaction
 * @param {Array} memo - The memo object where to append the transations
 */
function parseTcpHealthCheck(healthCheck, path, memo) {
  if (healthCheck.endpoint != null) {
    memo.push(new Transaction(
      path.concat(['endpoint']),
      healthCheck.endpoint,
      SET
    ));
  }
}

function reduceTcpHealthCheck(newState, field, value) {
  switch (field) {
    case 'endpoint':
      newState.tcp.endpoint = value;
      break;
  }
}

/**
 * JSON Parser Fragment for `CommandHealthCheck` type
 *
 * @param {Object} healthCheck - The healthcheck data to parse
 * @param {Array} path - The path prefix to the transaction
 * @param {Array} memo - The memo object where to append the transations
 */
function parseCommandHealthCheck(healthCheck, path, memo) {
  const {command={}} = healthCheck;

  if (command.shell != null) {
    memo.push(new Transaction(
      path.concat(['command', 'shell']),
      true,
      SET
    ));

    memo.push(new Transaction(
      path.concat(['command', 'string']),
      command.shell,
      SET
    ));
  }

  if ((command.argv != null) && Array.isArray(command.argv)) {
    memo.push(new Transaction(
      path.concat(['command', 'shell']),
      false,
      SET
    ));

    // Always cast to string, since the UI cannot handle arrays
    memo.push(new Transaction(
      path.concat(['command', 'string']),
      command.argv.join(' '),
      SET
    ));
  }
}

function reduceCommandHealthCheck(newState, field, value) {
  const {exec: {command={}}} = newState;

  switch (field) {
    case 'shell':
      // Shell is a meta-field that denotes if we are going to populate
      // the argument or the shell field. So, if we encounter an opposite
      // field, we should convert and set-up a placeholder
      if (value) {
        command.shell = '';
        if ((command.argv != null) && Array.isArray(command.argv)) {
          command.shell = command.argv.join(' ');
          delete command.argv;
        }
      } else {
        command.argv = [];
        if (command.shell != null) {
          command.argv = command.shell.split(' ');
          delete command.shell;
        }
      }
      break;

    case 'string':
      // By default we are creating `shell`. Only if `argv` exists
      // we should create an array
      if (command.argv != null) {
        command.argv = value.split(' ');
      } else {
        command.shell = value;
      }
      break;
  }
}

function reduceFormCommandHealthCheck(newState, field, value) {
  const {exec: {command={}}} = newState;

  switch (field) {
    case 'shell':
      command.shell = value;
      break;

    case 'string':
      command.string = value;
      break;
  }
}

const MultiContainerHealthChecks = {
  JSONSegmentReducer(state, {path, value}) {
    const newState = Object.assign({}, state);
    const [group, field, secondField] = path;

    // If we are assigning the entire group to `null`, we are
    // effectively disabling the health checks
    if ((path.length === 0) && (value == null)) {
      return null;
    }

    // Format object structure according to protocol switch
    if (group === 'protocol') {
      switch (value) {
        case COMMAND:
          newState.exec = {
            command: {}
          };
          delete newState.http;
          delete newState.tcp;
          break;

        case HTTP:
          delete newState.exec;
          newState.http = {};
          delete newState.tcp;
          break;

        case TCP:
          delete newState.exec;
          delete newState.http;
          newState.tcp = {};
          break;
      }

      return newState;
    }

    // Assign properties
    switch (group) {
      case 'exec':
        reduceCommandHealthCheck(newState, secondField, value);
        break;

      case 'http':
        reduceHttpHealthCheck(newState, field, value);
        break;

      case 'tcp':
        reduceTcpHealthCheck(newState, field, value);
        break;

      case 'gracePeriodSeconds':
        newState.gracePeriodSeconds = intOrNull(value);
        break;

      case 'intervalSeconds':
        newState.intervalSeconds = intOrNull(value);
        break;

      case 'maxConsecutiveFailures':
        newState.maxConsecutiveFailures = intOrNull(value);
        break;

      case 'timeoutSeconds':
        newState.timeoutSeconds = intOrNull(value);
        break;

      case 'delaySeconds':
        newState.delaySeconds = intOrNull(value);
        break;
    }

    return newState;
  },

  JSONSegmentParser(healthCheck, path) {
    const memo = [];

    // Parse detailed fields according to type
    if (healthCheck.http != null) {
      memo.push(new Transaction(path.concat(['protocol']), HTTP, SET));
      parseHttpHealthCheck(healthCheck.http, path.concat(['http']), memo);
    }
    if (healthCheck.tcp != null) {
      memo.push(new Transaction(path.concat(['protocol']), TCP, SET));
      parseTcpHealthCheck(healthCheck.tcp, path.concat(['tcp']), memo);
    }
    if (healthCheck.exec != null) {
      memo.push(new Transaction(path.concat(['protocol']), COMMAND, SET));
      parseCommandHealthCheck(healthCheck.exec, path.concat(['exec']), memo);
    }

    // Parse generic fields
    if (healthCheck.gracePeriodSeconds != null) {
      memo.push(new Transaction(
        path.concat(['gracePeriodSeconds']),
        parseInt(healthCheck.gracePeriodSeconds),
        SET
      ));
    }
    if (healthCheck.intervalSeconds != null) {
      memo.push(new Transaction(
        path.concat(['intervalSeconds']),
        parseInt(healthCheck.intervalSeconds),
        SET
      ));
    }
    if (healthCheck.maxConsecutiveFailures != null) {
      memo.push(new Transaction(
        path.concat(['maxConsecutiveFailures']),
        parseInt(healthCheck.maxConsecutiveFailures),
        SET
      ));
    }
    if (healthCheck.timeoutSeconds != null) {
      memo.push(new Transaction(
        path.concat(['timeoutSeconds']),
        parseInt(healthCheck.timeoutSeconds),
        SET
      ));
    }
    if (healthCheck.delaySeconds != null) {
      memo.push(new Transaction(
        path.concat(['delaySeconds']),
        parseInt(healthCheck.delaySeconds),
        SET
      ));
    }

    return memo;
  },

  FormReducer(state, {path, value}) {
    const newState = MultiContainerHealthChecks.JSONSegmentReducer
      .call(this, state, {path, value});

    // Bail early on nulled cases
    if (newState == null) {
      return newState;
    }

    const [group, field, secondField] = path;

    // Include additional fields only present in the form
    if (group === 'protocol') {
      newState.protocol = value;
    }

    // Assign detailed properties
    switch (group) {
      case 'exec':
        reduceFormCommandHealthCheck(newState, secondField, value);
        break;

      case 'http':
        reduceFormHttpHealthCheck(newState, field, value);
        break;
    }

    return newState;
  }
};

module.exports = MultiContainerHealthChecks;
