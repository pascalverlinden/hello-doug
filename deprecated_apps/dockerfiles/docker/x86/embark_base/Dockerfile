FROM quay.io/eris/gulp
MAINTAINER Monax Industries <support@monax.io>

USER root

RUN npm install --global embark-framework grunt-cli

# set user
USER $USER
WORKDIR $ERIS
VOLUME $ERIS
ENTRYPOINT "embark"
