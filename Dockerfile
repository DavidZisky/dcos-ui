FROM centos:7.3.1611

# Specify the component versions to use
ENV NODE_VERSION="4.4.7" \
    NPM_VERSION="3.9"

# Expose the 4200 port
EXPOSE 4200

# Copy required files in order to be able to do npm install
WORKDIR /dcos-ui

# Copy the entrypoint script that takes care of executing run-time init tasks,
# such as creating the scaffold in the user's repository
COPY scripts/docker-entrypoint /usr/local/bin/dcos-ui-docker-entrypoint

RUN set -x \
  && yum update -y \
  && yum group install -y "Development Tools" \
  && yum install -y curl git optipng optipng-devel libpng libpng-devel \
  && git clone https://github.com/DavidZisky/dcos-ui dcos-ui

# Install required components & prepare environment
RUN set -x \
  && curl -o- https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz | tar -C /usr/local --strip-components=1 -zx \
  && npm install -g npm@${NPM_VERSION}

RUN set -x \
  # Install npm dependencies
  && cd dcos-ui \
  && npm install -g node-pre-gyp gulp\
  && npm install \
  #&& cd /dcos-ui/dcos-ui/node_modules/optipng-bin \
  #&& node install.js \
  # Make sure bash is the default shell
  && rm /bin/sh \
  && ln -sf /bin/bash /bin/sh

RUN set -x \
  && git clone https://github.com/mesosphere/marathon.git \
  && mkdir -p dcos-ui/src/resources/raml/marathon/v2/types \
  && cp marathon/docs/docs/rest-api/public/api/v2/types/* dcos-ui/src/resources/raml/marathon/v2/types/ \
  && rm -rf marathon

# Define entrypoint
ENTRYPOINT [ "/bin/bash", "/usr/local/bin/dcos-ui-docker-entrypoint" ]

# Export mountable volumes
VOLUME /dcos-ui
VOLUME /dcos-ui-plugins
