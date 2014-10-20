#ifndef RED9_SRLM_JSONOUTPUT_HPP__
#define RED9_SRLM_JSONOUTPUT_HPP__

class JSONOutput{
public:
    virtual void writeResults(rapidjson::Writer<rapidjson::StringBuffer> &writer) = 0;
};

#endif // RED9_SRLM_JSONOUTPUT_HPP__