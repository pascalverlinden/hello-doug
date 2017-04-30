FROM quay.io/eris/node
MAINTAINER Monax Industries <support@monax.io>

RUN npm install --global gulp

# set user
USER $USER
WORKDIR $ERIS
VOLUME $ERIS
ENTRYPOINT "gulp"
