FROM node:9
USER node

RUN mkdir /home/node/.npm-global ; \
    mkdir -p /home/node/app ; \
    chown -R node:node /home/node/app ; \
    chown -R node:node /home/node/.npm-global
ENV PATH=/home/node/.npm-global/bin:$PATH
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

WORKDIR /home/node/app
RUN npm install -g @angular/cli
COPY package.json /home/node/app
RUN npm install

COPY . /home/node/app
RUN ng build
CMD node server
EXPOSE 3000
