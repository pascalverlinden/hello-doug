FROM quay.io/eris/gulp
MAINTAINER Monax Industries <support@monax.io>

USER root

RUN npm install --global s-unit

# set user
USER $USER
WORKDIR $ERIS
VOLUME $ERIS
ENTRYPOINT "sunit"
