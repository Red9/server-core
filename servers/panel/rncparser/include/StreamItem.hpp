#ifndef RED9_SRLM_STREAMITEM_HPP__
#define RED9_SRLM_STREAMITEM_HPP__

#include <string>
#include <sstream>
#include <iomanip>

class StreamItem {
private:
    bool valid;
    int streamPosition;
    std::string *errorMessage;
public:
    StreamItem(int position_, bool valid_, std::string *errorMessage_);
    ~StreamItem();
    bool isValid();

    int getPosition();

    void setValid(bool valid_, std::string *errorMessage_);

    std::string getErrorMessage();

};


#endif // RED9_SRLM_STREAMITEM_HPP__