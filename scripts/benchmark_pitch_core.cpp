#include "jamloom/remix.h"
#include <chrono>
#include <fstream>
#include <iostream>
int main(int argc,char**argv){
 if(argc!=3)return 2;
 const unsigned rate=std::stoul(argv[2]);
 std::ifstream in(argv[1],std::ios::binary);if(!in)return 2;
 std::vector<float> samples;float x;while(in.read(reinterpret_cast<char*>(&x),4))samples.push_back(x);
 const auto began=std::chrono::steady_clock::now();std::cout<<"{\"frequencies\":[";bool first=true;
 for(size_t start=0;start+2048<=samples.size();start+=320){
  jamloom::AudioBuffer b;b.sample_rate=rate;b.mono.assign(samples.begin()+start,samples.begin()+start+2048);double hz=0;
  try{hz=jamloom::analyze(b).pitch_hz;}catch(const std::invalid_argument&){}
  if(!first)std::cout<<',';first=false;std::cout<<hz;
 }
 std::cout<<"],\"seconds\":"<<std::chrono::duration<double>(std::chrono::steady_clock::now()-began).count()<<"}";
}
