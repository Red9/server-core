mag=ans.data(:,15);
mag(wave==0)=0;
mag(mag>0)=1;
mag(mag<0)=-1;
figure,subplot(2,1,1),plot(ans.data(:,21));
subplot(2,1,2),plot(mag);