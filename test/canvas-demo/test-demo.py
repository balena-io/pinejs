from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
import time, sys

#TODO: Reduce time by waiting for next event specifically instead of adding random sleep time.

browser = webdriver.Chrome()
root_path = sys.argv[0].split('\\')[:-3]
root_path = '/'.join(root_path)
browser.get("file:///%s/src/client/frame-glue/src/index.html" % root_path)
time.sleep(1)
browser.find_element_by_id("blm1").click()
browser.find_element_by_id("bem").click()
time.sleep(1)

try:
    browser.find_element_by_xpath("//a[contains(@href,'#importExportTab')]").click()
except NoSuchElementException:
    assert 0, "can't find importExportTab"

#This string has double escaped double quotes because the first slash is consumed by 
#the python string, and then the second slash is used to differentiate the double quotes 
#within the string (escaped) from those enclosing the string (not escaped). Also, it's 
#all one line as newlines make the javascript fail. Similar principles for the '\\n'.

SQLdata = '''INSERT INTO \\"pilot\\" (\\"id\\",\\"name\\") values ('1','Joachim');\\nINSERT INTO \\"pilot\\" (\\"id\\",\\"name\\") values ('2','Esteban');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"name\\") values ('1','Boeing 747');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"name\\") values ('2','Spitfire');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"name\\") values ('3','Concorde');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"name\\") values ('4','Mirage 2000');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot_id\\",\\"plane_id\\") values ('1','1','2');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot_id\\",\\"plane_id\\") values ('2','1','3');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot_id\\",\\"plane_id\\") values ('3','1','4');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot_id\\",\\"plane_id\\") values ('4','2','1');\\nINSERT INTO \\"pilot-is_experienced\\" (\\"id\\",\\"pilot_id\\") values ('1','1');'''

browser.execute_script('window.importExportEditor.setValue("%s");' % SQLdata)
browser.find_element_by_id("bidb").click()

try:
    browser.find_element_by_xpath("//a[contains(@href,'#dataTab')]").click()
except NoSuchElementException:
    assert 0, "can't find dataTab"

'''here are the 11 remaining steps for this test case:'''
	
'''expand pilots'''

'''expand pilot can fly plane'''

'''delete joachim can fly _some plane_'''

'''click -confirm- or whatever'''

'''check if error'''

'''click revise request'''

'''expand pilot is experienced'''

'''delete joachim is experienced'''

'''click Apply All'''

'''check if error (how?)'''

'''close browser'''
