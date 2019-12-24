FROM ubuntu:18.04

# Updating Ubuntu packages
RUN apt-get update && yes|apt-get upgrade
RUN apt-get install -y emacs

# Adding wget and bzip2
RUN apt-get install -y wget bzip2 build-essential sudo

# Add user ubuntu with no password, add to sudo group
RUN adduser --disabled-password --gecos '' ubuntu
RUN adduser ubuntu sudo
RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers
USER ubuntu
WORKDIR /home/ubuntu/
RUN chmod a+rwx /home/ubuntu/
#RUN echo `pwd`

# Anaconda installing
RUN wget https://repo.continuum.io/archive/Anaconda3-5.0.1-Linux-x86_64.sh
RUN bash Anaconda3-5.0.1-Linux-x86_64.sh -b
RUN rm Anaconda3-5.0.1-Linux-x86_64.sh

# Set path to conda 
#ENV PATH /root/anaconda3/bin:$PATH
ENV PATH /home/ubuntu/anaconda3/bin:$PATH

#COPY ALL FILES
COPY requirements.yml /opt/app/requirements.yml
WORKDIR /opt/app

# Updating Anaconda packages
RUN conda env update -f requirements.yml
RUN pip install gdist pymeshfix flask-uploads flask-dropzone
RUN pip install tornado==4.5.3
RUN sudo apt-get update
RUN sudo apt-get install -y libgl1-mesa-glx libssl1.0.0 tetgen

#COPY ALL FILES
COPY ./src /opt/app/src
COPY ./Data /opt/app/Data

#Execute 
EXPOSE 5000
CMD ["python", "-u", "src/app.py"]
