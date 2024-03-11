<?php

namespace Webkul\Paypal\Helpers;

use Illuminate\Support\Facades\Log;
use Webkul\Paypal\Payment\Standard;
use Webkul\Sales\Repositories\OrderRepository;
use Webkul\Sales\Repositories\InvoiceRepository;
use Webkul\Checkout\Facades\Cart;
use Webkul\Checkout\Repositories\CartRepository;

class Ipn
{
    /**
     * IPN post data.
     *
     * @var array
     */
    protected $post;

    /**
     * Order $order
     *
     * @var \Webkul\Sales\Contracts\Order
     */
    protected $order;
    /**
     * Create a new helper instance.
     *
     * @param  \Webkul\Sales\Repositories\OrderRepository  $orderRepository
     * @param  \Webkul\Sales\Repositories\InvoiceRepository  $invoiceRepository
     * @param  \Webkul\Paypal\Payment\Standard  $paypalStandard
     * @return void
     */
    public function __construct(
        protected Standard $paypalStandard,
        protected OrderRepository $orderRepository,
        protected CartRepository $cartRepository,
        protected InvoiceRepository $invoiceRepository
    )
    {
    }

    /**
     * This function process the IPN sent from paypal end.
     *
     * @param  array  $post
     * @return null|void|\Exception
     */
    public function processIpn($post)
    {
        $this->post = $post;
 
        Log::info("ipn post".json_encode($this->post));

        if (! $this->postBack()) {
            return;
        }

        try {
            if (
                isset($this->post['txn_type'])
                && 'recurring_payment' == $this->post['txn_type']
            ) {

            } else {
                $this->getOrder();

                $this->processOrder();
            }
        } catch (\Exception $e) {
            throw $e;
        }
    }

    /**
     * Load order via IPN invoice id.
     *
     * @return void
     */
    protected function getOrder()
    {
        if (empty($this->order)) {
            $this->order = $this->orderRepository->findOneByField(['cart_id' => $this->post['invoice']]);
        }
        if(empty($this->order)) {
            $cart = $this->cartRepository->findOneWhere([
                'id'   => $this->post['invoice']
            ]);
            Cart::setCart($cart);

            $this->orderRepository->create(Cart::prepareDataForOrder());

            $this->order = $this->orderRepository->findOneByField(['cart_id' => $this->post['invoice']]);
        }
    }

    /**
     * Process order and create invoice.
     *
     * @return void
     */
    protected function processOrder()
    {
        if(isset($this->post['payment_status'])) {
            if ($this->post['payment_status'] == 'Completed') {
                if ($this->post['mc_gross'] != $this->order->grand_total) {
                    return;
                } else {
                    $this->orderRepository->update(['status' => 'processing'], $this->order->id);
    
                    if ($this->order->canInvoice()) {
                        $invoice = $this->invoiceRepository->create($this->prepareInvoiceData());
                    }
                }
            }
        }
    }

    /**
     * Prepares order's invoice data for creation.
     *
     * @return array
     */
    protected function prepareInvoiceData()
    {
        $invoiceData = ['order_id' => $this->order->id];

        foreach ($this->order->items as $item) {
            $invoiceData['invoice']['items'][$item->id] = $item->qty_to_invoice;
        }

        return $invoiceData;
    }

    /**
     * Post back to PayPal to check whether this request is a valid one.
     *
     * @return bool
     */
    protected function postBack()
    {
        $url = $this->paypalStandard->getIPNUrl();

        $request = curl_init();

        curl_setopt_array($request, [
            CURLOPT_URL            => $url,
            CURLOPT_POST           => TRUE,
            CURLOPT_POSTFIELDS     => http_build_query(['cmd' => '_notify-validate'] + $this->post),
            CURLOPT_RETURNTRANSFER => TRUE,
            CURLOPT_HEADER         => FALSE,
        ]);

        $response = curl_exec($request);
        $status = curl_getinfo($request, CURLINFO_HTTP_CODE);

        curl_close($request);

        if ($status == 200 && $response == 'VERIFIED') {
            return true;
        }

        return false;
    }
}
