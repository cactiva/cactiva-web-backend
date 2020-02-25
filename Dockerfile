FROM node:stretch
   
# Create Directory for the Container
WORKDIR /usr/src/app

ENV TZ=Asia/Jakarta
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install all Packages
RUN apt update
RUN apt install -y yarn
ADD . /usr/src/app

RUN yarn

CMD [ "yarn", "dev" ]
EXPOSE 10000