# Graphical User Interface Prototype - CURRENT

Authors: Giuseppe Silvestri

Date: 11/04/2023

Version: V1 - description of EZWallet in CURRENT form (as received by teachers)

NOTE: in the images "App Icon" is used as a placeholder for EZWallet's logo, which has not been defined yet.

## Homepage

![Homepage](code/images/GUIPrototypeV1/Homepage.png)

Clicking "Login / Register" leads to the [login page](#login-page).

## Login Page

![Login Page](code/images/GUIPrototypeV1/Login%20Page.png)

- Clicking "Homepage" leads to the [homepage](#homepage);
- clicking "Register" leads to the [registration page](#registration-page);
- clicking "Login" (assuming the credentials are correct) leads to the [transactions page](#transactions-page).

## Registration Page

![Registration Page](code/images/GUIPrototypeV1/Register%20Page.png)

- Clicking "Register" (assuming the creation of the account is allowed) leads to the [transactions page](#transactions-page);
- clicking "Log in" leads to the [login page](#login-page).

## Transactions Page

NOTE: the transactions are actually the **labels**, which are comprised of transaction amount, name and the colour of the transaction's category. To get the list of transactions, the API should be used.

![Transactions Page](code/images/GUIPrototypeV1/Transaction%20Page.png)

- Clicking "My account" leads to the [user account page](#user-account-page);
- clicking "Go to categories" leads to the [categories page](#categories-page).

## Categories Page

![Categories Page](code/images/GUIPrototypeV1/Category%20Page.png)

- Clicking "My account" leads to the [user account page](#user-account-page);
- clicking "Go to transactions" leads to the [transactions page](#transactions-page).

## User Account Page

![User Account Page](code/images/GUIPrototypeV1/User%20Page.png)

- Clicking "My wallet" leads to the [transactions page](#transactions-page);
- clicking "Log out" leads to the [homepage](#homepage).
