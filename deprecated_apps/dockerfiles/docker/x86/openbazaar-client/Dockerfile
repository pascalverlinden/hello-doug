FROM quay.io/eris/node
MAINTAINER Monax Industries <support@monax.io>

# Dependencies
RUN npm install --global electron-prebuilt

# set user
USER $USER
WORKDIR $ERIS

# install client
RUN mkdir apps && \
  cd apps && \
  git clone https://github.com/OpenBazaar/OpenBazaar-Client.git && \
  cd OpenBazaar-Client && \
  npm install

# finalize
VOLUME $ERIS
ENTRYPOINT npm start
