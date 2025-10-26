/* global Buffer */

const mockPdfParse = jest.fn(async (buffer) => {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Input must be a Buffer');
  }

  const mockText = `Student Record

John Doe Student
Student ID: 123456789
123 Main Street
Montreal, QC
Canada H3A 1B1
Birthdate: 1995-01-15
Permanent Code: ABC12345678
Telephone: (514) 555-0123

Undergraduate Academic Program History

Active in Program
Fall 2020
Bachelor of Engineering
Software Engineering
Extended Credit Program
Career Edge
Admit Term
Fall 2020
Matriculated

Min. Credits Required:
120.00
Program Credits Earned:
90.50
Cumulative GPA:
3.75
Writing Skills Requirement: Satisfied

Beginning of Undergraduate Record

Fall 2020
Bachelor of Engineering, Software Engineering, Extended Credit Program
COURSE          DESCRIPTION                    ATTEMPTED    GRADE    NOTATION    GPA      CLASS        CLASS        PROGRAM CREDITS    OTHER
                                                                                          AVG          SIZE         EARNED
COMP     248    Introduction to Programming    3.00         A-                   3.67     2.85         156          3.00
ENGR     201    Engineering Design             2.00         B+                   3.33     2.95         98           2.00
MATH     205    Calculus I                     3.00         A                    4.00     3.20         201          3.00

Term GPA 3.67

20/08/2021: ASSESSED: ACCEPTABLE STANDING
ASSESSMENT GPA: 3.64 - ASSESSMENT PERIOD: Fall 2020 - Summer 2021

Winter 2021
Bachelor of Engineering, Software Engineering, Extended Credit Program
COURSE          DESCRIPTION                    ATTEMPTED    GRADE    NOTATION    GPA      CLASS        CLASS        PROGRAM CREDITS    OTHER
                                                                                          AVG          SIZE         EARNED
COMP     249    OBJ-ORIENTED PROGRAMMING II    3.75         A                    4.00     3.15         142          3.75
ENGR     202    Engineering Materials          3.00         B                    3.00     2.80         89           3.00
MATH     206    Calculus II                    3.00         A-                   3.67     3.05         178          3.00

Term GPA 3.56

20/08/2021: ASSESSED: ACCEPTABLE STANDING
ASSESSMENT GPA: 3.64 - ASSESSMENT PERIOD: Fall 2020 - Summer 2021

Summer 2021
Bachelor of Engineering, Software Engineering, Extended Credit Program
Transfer Credits
COURSE          DESCRIPTION         GRADE    YEAR ATTENDED    PROGRAM CREDITS
                                                              EARNED
MATH     101    Precalculus         EX       2019             3.00
PHYS     101    General Physics     TRC      2019             4.00

COURSE          DESCRIPTION                    ATTEMPTED    GRADE    NOTATION    GPA      CLASS        CLASS        PROGRAM CREDITS    OTHER
                                                                                          AVG          SIZE         EARNED
COMP     352    Data Structures and Algorithms 3.75         A+                   4.00     2.90         67           3.75
ELEC     273    Digital Systems                3.75         B+                   3.33     2.75         45           3.75

Term GPA 3.67

20/08/2021: ASSESSED: ACCEPTABLE STANDING
ASSESSMENT GPA: 3.64 - ASSESSMENT PERIOD: Fall 2020 - Summer 2021

End of Student Record`;

  return {
    text: mockText,
    numpages: 1,
    numrender: 25,
    info: {
      PDFFormatVersion: '1.4',
      IsAcroFormPresent: false,
      IsXFAPresent: false,
    },
    metadata: null,
    version: '1.10.100',
  };
});

module.exports = mockPdfParse;
