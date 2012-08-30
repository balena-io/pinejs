from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.keys import Keys
import time, sys, os

def find_and_click(where, why):
	try:
		#print(where, why)
		elem = browser.find_element_by_xpath(where)
		#elem.click() # this should work except for a selenium/chrome bug. http://code.google.com/p/selenium/issues/detail?id=2766
		#So we are forced to directly navigate to the link below.
		#print elem.get_attribute('href')
		browser.get(elem.get_attribute('href'))
	except NoSuchElementException:
		assert 0, "can't %s" % why
	time.sleep(1)

#TODO: Reduce time by waiting for next event specifically instead of adding random sleep time.

browser = webdriver.Chrome()

#expects to be three levels deep from the root. If path changes, the value '3' below may need to change also.
root_path = sys.path[0].split('\\')[:-2]
root_path = '/'.join(root_path)

browser.get("file:///%s/src/client/frame-glue/src/index.html" % root_path)
time.sleep(2)

browser.find_element_by_id("bl").click()
time.sleep(1)
browser.execute_script('document.getElementById("username").value = "test";')
browser.execute_script('document.getElementById("password").value = "test";')
browser.find_element_by_xpath("//button[descendant::text()='Login']").click()
time.sleep(1)

browser.find_element_by_xpath("//button[descendant::text()='Revise Request']").click()
time.sleep(1)

browser.find_element_by_id("bcdb").click()
time.sleep(1)

browser.find_element_by_id("blm1").click()
time.sleep(1)

browser.find_element_by_id("bem").click()
time.sleep(1)

try:
	browser.find_element_by_xpath("//a[contains(@href,'#importExportTab')]").click()
except NoSuchElementException:
	assert 0, "can't switch to importExportTab"

#This string has double escaped double quotes because the first slash is consumed by 
#the python string, and then the second slash is used to differentiate the double quotes 
#within the string (escaped) from those enclosing the string (not escaped). Also, it's 
#all one line as newlines make the javascript fail. Same goes for the '\\n'.

SQLdata = '''INSERT INTO \\"pilot\\" (\\"id\\",\\"value\\", \\"is experienced\\") values ('1','Joachim','1');\\nINSERT INTO \\"pilot\\" (\\"id\\",\\"value\\") values ('2','Esteban');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"value\\") values ('1','Boeing 747');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"value\\") values ('2','Spitfire');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"value\\") values ('3','Concorde');\\nINSERT INTO \\"plane\\" (\\"id\\",\\"value\\") values ('4','Mirage 2000');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot\\",\\"plane\\") values ('1','1','2');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot\\",\\"plane\\") values ('2','1','3');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot\\",\\"plane\\") values ('3','1','4');\\nINSERT INTO \\"pilot-can_fly-plane\\" (\\"id\\",\\"pilot\\",\\"plane\\") values ('4','2','1');'''

browser.execute_script('window.importExportEditor.setValue("%s");' % SQLdata)
browser.find_element_by_id("bidb").click()
time.sleep(1)

try:
	browser.find_element_by_xpath("//a[contains(@href,'#dataTab')]").click()
except NoSuchElementException:
	assert 0, "can't switch to dataTab"
time.sleep(1)

#here are the 11 remaining steps for this test case:

find_and_click("//a[contains(@onclick,\"pilot'\")]", "expand pilots")

find_and_click("//a[contains(@onclick,\"pilot/pilot-can_fly-plane'\")]", "can't expand pilot can fly plane")

find_and_click("//a[contains(@onclick,\"pilot/pilot-can_fly-plane/pilot-can_fly-plane.3*del'\")]", "delete fact [Joachim can fly Boeing 747]")

'''click -confirm- or whatever'''
browser.find_element_by_xpath("//tr[@id='tr--data--pilot-can_fly-plane']//input[@type='submit']").click()
time.sleep(1)

'''click revise request'''
browser.find_element_by_xpath("//button[descendant::text()='Revise Request']").click()
time.sleep(1)

'''expand pilot is experienced'''
find_and_click("//a[contains(@onclick,\"pilot/(pilot-can_fly-plane/pilot-can_fly-plane.3*del,pilot-is_experienced)'\")]", "expand pilot is experienced")

'''delete joachim is experienced'''
find_and_click("//a[contains(@onclick,\"/pilot/(pilot-can_fly-plane/pilot-can_fly-plane.3*del,pilot-is_experienced/pilot-is_experienced.1*del)'\")]", "delete fact [Joachim is experienced]")

'''click Apply All'''
browser.find_element_by_xpath("//input[@value='Apply All Changes']").click()
time.sleep(1)

'''check if error'''
if not browser.current_url.split('#')[-1] == '!/data/':
	assert 0, "Transaction not completed successfully"

'''close browser'''
browser.close()
